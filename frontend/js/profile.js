// ==========================================
// 4. PROFILE
// ==========================================

function initProfile() {

    fetch(
        'http://localhost:5000/api/profile'
    )

        .then(res => res.json())

        .then(data => {

            if (data.status === 'success') {

                const info = data.data;


                document.getElementById(
                    'pro-name'
                ).innerText =
                    info.name ||
                    'Chưa cập nhật';


                document.getElementById(
                    'pro-email'
                ).innerText =
                    info.email ||
                    'Chưa cập nhật';


                const gh =
                    document.getElementById(
                        'pro-github'
                    );

                const githubUrl = info.gitlink || info.gitink || info.github;

                if (githubUrl) {

                    gh.innerText =
                        githubUrl;

                    gh.href =
                        githubUrl;

                } else {

                    gh.innerText =
                        'Chưa cập nhật';
                }


                const fg =
                    document.getElementById(
                        'pro-figma'
                    );

                const figmaUrl = info.figmalink || info.figma;

                if (figmaUrl) {

                    fg.innerText =
                        figmaUrl;

                    fg.href =
                        figmaUrl;

                } else {

                    fg.innerText =
                        'Chưa cập nhật';
                }


                if (info.avatar) {

                    document.getElementById(
                        'profile-avatar'
                    ).style.backgroundImage =
                        `url('${info.avatar}')`;
                }
            }
        })

        .catch(err =>
            console.error(
                "Lỗi lấy Profile:",
                err
            )
        );
}